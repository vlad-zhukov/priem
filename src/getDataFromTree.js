import React from 'react';
import {getContainerMap} from './Container';
import {type} from './helpers';

function getProps(element) {
    return element.props || element.attributes;
}

function isReactElement(element) {
    return !!element.type;
}

function isComponentClass(Comp) {
    return Comp.prototype && (Comp.prototype.render || Comp.prototype.isReactComponent);
}

// Recurse a React Element tree, running visitor on each element.
// If visitor returns `false`, don't call the element's render function
//   or recurse into its child elements
export function walkTree(element, visitor) {
    if (Array.isArray(element)) {
        element.forEach(item => walkTree(item, visitor));
        return;
    }

    if (!element) {
        return;
    }

    // a stateless functional component or a class
    if (isReactElement(element)) {
        if (type(element.type) === 'function') {
            const Comp = element.type;
            const props = Object.assign({}, Comp.defaultProps, getProps(element));
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
                instance.setState = (newState) => {
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
            }
            else {
                // just a stateless functional
                if (visitor(element, null) === false) {
                    return;
                }

                child = Comp(props);
            }

            if (child) {
                if (Array.isArray(child)) {
                    child.forEach(item => walkTree(item, visitor));
                }
                else {
                    walkTree(child, visitor);
                }
            }
        }
        else {
            // a basic string or dom element, just get children
            if (visitor(element, null) === false) {
                return;
            }

            if (element.props && element.props.children) {
                React.Children.forEach(element.props.children, (child) => {
                    if (child) {
                        walkTree(child, visitor);
                    }
                });
            }
        }
    }
    else if (type(element) === 'string' || type(element) === 'number') {
        // Just visit these, they are leaves so we don't keep traversing.
        visitor(element, null);
    }
    // TODO: Portals?
}

function isPriemComponent(instance) {
    return instance._isPriemComponent === true;
}

function getPromisesFromTree(rootElement, fetchRoot) {
    const promises = [];

    walkTree(rootElement, (element, instance) => {
        // Skip root
        if (!fetchRoot && element === rootElement) {
            return;
        }

        if (instance && isReactElement(element) && isPriemComponent(instance)) {
            // todo: filter added sources

            const p = Object.keys(instance._sources).map((key) => {
                const source = instance._sources[key];
                if (type(source.runAsync) === 'function') {
                    const opts = {props: instance._getProps(), isForced: false};
                    const promise = Promise.resolve()
                        .then(() => source.runAsync(opts))
                        .then(() => source);

                    return {promise, instance};
                }
                return {promise: Promise.resolve(source), instance};
            });

            promises.push(...p);

            // Tell walkTree to not recurse inside this component.
            // We will wait for the query to execute before attempting it.
            return false; // eslint-disable-line consistent-return
        }
    });

    return promises;
}

// XXX component Cache
export default function getDataFromTree(rootElement, fetchRoot = true) {
    const queries = getPromisesFromTree(rootElement, fetchRoot);

    // no queries found, nothing to do
    if (!queries.length) {
        return Promise.resolve({});
    }

    // wait on each query that we found, re-rendering the subtree when it's done
    const mappedQueries = queries.reduce(
        (result, {promise, instance}) =>
            // const d = promise.then(() => getDataFromTree(element, false));

            // we've just grabbed the query for element, so don't try and get it again
            result.concat(promise),
        []
    );

    return Promise.all(mappedQueries).then(sources =>
        sources.reduce((result, {state, _meta}) => {
            if (_meta.ssrKey) {
                result[_meta.ssrKey] = {state, meta: _meta};
            }
            return result;
        }, {})
    );
}
