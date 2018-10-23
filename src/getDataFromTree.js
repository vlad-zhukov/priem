import reactTreeWalker from 'react-tree-walker';
import {assertType} from './helpers';

function isPriemComponent(instance) {
    return instance && instance._isPriemComponent === true;
}

function visitor(element, instance) {
    if (!isPriemComponent(instance)) {
        return;
    }

    const {children, sources, ...props} = instance.props;
    assertType(sources, ['object'], "<Priem />'s 'sources'");

    const promises = Object.keys(sources).reduce((acc, key) => {
        const itemValue = sources[key]._get(props);
        if (itemValue !== null) {
            acc.push(itemValue.promise);
        }
        return acc;
    }, []);

    // eslint-disable-next-line consistent-return
    return Promise.all(promises);
}

export default function getDataFromTree(tree) {
    return reactTreeWalker(tree, visitor);
}
