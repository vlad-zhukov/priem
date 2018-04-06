/**
 * @jest-environment node
 */

import React from 'react';
import ReactDOM from 'react-dom/server';
import {getDataFromTree} from '../src/index';
import {TestComponentSimple, TestComponentNested} from '../__test-helpers__/util';

it('should fetch and render to string with data', async () => {
    const data = await getDataFromTree(<TestComponentSimple />);
    expect(data).toMatchSnapshot();

    const content = ReactDOM.renderToStaticMarkup(<TestComponentSimple initialState={data} />);
    expect(content).toBe('<div>foo</div>');
});

it('should not fetch data from a nested component', async () => {
    const data = await getDataFromTree(<TestComponentNested />);
    expect(data).toMatchSnapshot();

    const content = ReactDOM.renderToStaticMarkup(<TestComponentNested initialState={data} />);
    expect(content).toBe('');
});
