import React from 'react';
import {Priem} from './Priem';

export default function withPriem(props) {
    if (props.render || props.component || props.children) {
        throw new Error("'render', 'component' and 'children' props are not supported with 'withPriem' decorator.");
    }

    return component => <Priem {...props} component={component} />;
}
