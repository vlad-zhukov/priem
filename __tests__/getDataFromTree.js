/**
 * @jest-environment node
 */

import React from 'react';
import ReactDOM from 'react-dom/server';
import {getDataFromTree} from '../src/index';
import {getContainerMap, injectStateMap} from '../src/Container';
import {TestComponentSimple, TestComponentNested, removeObjectProps} from '../__test-helpers__/util';

it('should fetch and render to string with data', async () => {
    removeObjectProps(getContainerMap());
    const element = <TestComponentSimple ssrKey="unique-key-1" />;
    const data = await getDataFromTree(element);

    expect(data).toMatchSnapshot();

    removeObjectProps(getContainerMap());
    injectStateMap(data);
    const content = ReactDOM.renderToStaticMarkup(element);

    expect(content).toBe('<div>foo</div>');
});

it('should not fetch data from a nested component', async () => {
    removeObjectProps(getContainerMap());
    const element = (
        <TestComponentNested
            syncContainerProps={{ssrKey: 'unique-key-1'}}
            container1Props={{ssrKey: 'unique-key-2'}}
            container2Props={{ssrKey: 'unique-key-3'}}
        />
    );
    const data = await getDataFromTree(element);

    expect(data).toMatchSnapshot();

    removeObjectProps(getContainerMap());
    injectStateMap(data);
    const content = ReactDOM.renderToStaticMarkup(element);

    expect(content).toBe('');
});
