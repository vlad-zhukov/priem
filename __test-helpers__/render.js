/* eslint-disable import/no-extraneous-dependencies */

import React from 'react';
import {render} from 'react-testing-library';

export default (element, options) => {
    const ref = React.createRef();
    const el = React.cloneElement(element, {ref});
    const result = render(el, options);
    return {...result, instance: ref.current};
};
