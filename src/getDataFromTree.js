import reactTreeWalker from 'react-tree-walker';

function isPriemComponent(instance) {
    return instance && instance._isPriemComponent === true;
}

function visitor(element, instance) {
    if (!isPriemComponent(instance)) {
        return;
    }

    const {children, component, sources, ...props} = instance.props;
    const promises = Object.keys(sources).reduce((acc, key) => {
        const itemValue = sources[key]._get(props);
        // TODO: what causes this?
        if (itemValue && itemValue.promise) {
            props[key] = itemValue.data;
            acc.push(itemValue.promise);
        }
        return acc;
    }, []);

    // eslint-disable-next-line consistent-return
    return Promise.all(promises);
}

export default function getDataFromTree(rootElement, rootContext) {
    return reactTreeWalker(rootElement, visitor, rootContext);
}
