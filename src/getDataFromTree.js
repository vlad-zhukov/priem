import React from 'react';
import {type} from './helpers';

function isReactElement(element) {
    return !!element.type;
}

function isComponentClass(Comp) {
    return Comp.prototype && Comp.prototype.render && Comp.prototype.isReactComponent;
}

// Recurse a React Element tree, running visitor on each element.
// If visitor returns `false`, don't call the element's render function
//   or recurse into its child elements
export function walkTree(element, visitor) {
    const typeOfElement = type(element);

    if (typeOfElement === 'array') {
        element.forEach(item => walkTree(item, visitor));
        return;
    }

    if (element == null || typeOfElement === 'boolean') {
        return;
    }

    if (typeOfElement === 'string' || typeOfElement === 'number') {
        // Just visit these, they are leaves so we don't keep traversing.
        visitor(element, null);
        return;
    }

    // a stateless functional component or a class
    if (!isReactElement(element)) {
        throw new TypeError(`Cannot render '${typeOfElement}'.`);
    }

    if (type(element.type) === 'function') {
        const Comp = element.type;
        const props = Object.assign({}, Comp.defaultProps, element.props);
        let child;

        // Are we are a react class?
        if (isComponentClass(Comp)) {
            const instance = new Comp(props);
            // In case the user doesn't pass these to super in the constructor
            instance.props = instance.props || props;
            // set the instance state to null (not undefined) if not set, to match React behaviour
            instance.state = instance.state || null;

            // Override setState to just change the state, not queue up an update.
            //   (we can't do the default React thing as we aren't mounted "properly"
            //   however, we don't need to re-render as well only support setState in
            //   componentWillMount, which happens *before* render).
            instance.setState = newState => {
                if (type(newState) === 'function') {
                    // eslint-disable-next-line no-param-reassign
                    newState = newState(instance.state, instance.props);
                }
                instance.state = Object.assign({}, instance.state, newState);
            };

            // this is a poor man's version of
            // if (instance.componentDidMount) {
            //     instance.componentDidMount();
            // }
            //
            // if (instance.componentDidUpdate) {
            //     instance.componentDidUpdate();
            // }

            if (visitor(element, instance) === false) {
                return;
            }

            child = instance.render();
        } else {
            // just a stateless functional
            if (visitor(element, null) === false) {
                return;
            }

            child = Comp(props);
        }

        if (child === undefined) {
            throw new Error("The 'render' class method or a functional component must not return 'undefined'.");
        }

        walkTree(child, visitor);
    } else {
        // a basic string or dom element, just get children
        if (visitor(element, null) === false) {
            return;
        }

        if (element.props && element.props.children) {
            React.Children.forEach(element.props.children, child => {
                if (child) {
                    walkTree(child, visitor);
                }
            });
        }
    }

    // TODO: Portals?
}

function isPriemComponent(instance) {
    return instance._isPriemComponent === true;
}

function getPromisesFromTree(rootElement) {
    const promises = [];

    // eslint-disable-next-line consistent-return
    walkTree(rootElement, (element, instance) => {
        if (instance && isReactElement(element) && isPriemComponent(instance)) {
            // todo: filter added sources

            const p = Object.keys(instance._sources).map(key => {
                const source = instance._sources[key];

                if (type(source._runAsync) === 'function') {
                    const opts = {
                        props: instance._getProps(),
                        isForced: false,
                    };
                    const promise = Promise.resolve()
                        .then(() => source._runAsync(opts))
                        .then(() => source);

                    return {promise, instance};
                }
                return {promise: Promise.resolve(source), instance};
            });

            promises.push(...p);

            // Tell walkTree to not recurse inside this component.
            // We will wait for the query to execute before attempting it.
            return false;
        }
    });

    return promises;
}

// XXX component Cache
export default function getDataFromTree(rootElement) {
    const errors = [];
    let queries;

    try {
        queries = getPromisesFromTree(rootElement);
    } catch (e) {
        return Promise.reject(e);
    }

    if (queries.length === 0) {
        return Promise.resolve();
    }

    const mappedQueries = queries.map(({promise, instance}) =>
        promise.then(() => getDataFromTree(instance.render())).catch(e => errors.push(e))
    );

    return Promise.all(mappedQueries).then(() => {
        if (errors.length > 0) {
            const error =
                errors.length === 1
                    ? errors[0]
                    : new Error(`${errors.length} errors were thrown when fetching containers.`);
            error.queryErrors = errors;
            throw error;
        }
    });
}
