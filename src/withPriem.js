import React from 'react';
import Priem from './Priem';

export default function withPriem(opts) {
    if (opts.component || opts.children) {
        throw new Error("Priem: 'component' and 'children' props are not supported for a 'withPriem' decorator.");
    }

    return component => props => React.createElement(Priem, Object.assign({}, opts, props, {component}));
}
