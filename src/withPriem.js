import React from 'react';
import Priem from './Priem';

export default function withPriem(opts) {
    if (opts.render || opts.component || opts.children) {
        throw new Error("'render', 'component' and 'children' props are not supported with 'withPriem' decorator.");
    }

    return component => props => React.createElement(Priem, {...opts, ...props, component});
}
