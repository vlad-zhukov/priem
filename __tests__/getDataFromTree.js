/**
 * @jest-environment node
 */

import React from 'react';
import {getDataFromTree} from '../src/index';
import {TestComponentSimple, TestComponentNested} from '../__test-helpers__/util';

it('should fetch data from a simple component', async () => {
    const data = await getDataFromTree(<TestComponentSimple />);
    expect(data).toMatchSnapshot();
});

it('should not fetch data from a nested component', async () => {
    const data = await getDataFromTree(<TestComponentNested />);
    expect(data).toMatchSnapshot();
});
