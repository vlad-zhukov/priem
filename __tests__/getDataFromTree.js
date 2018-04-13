/**
 * @jest-environment node
 */

import ReactDOM from 'react-dom/server';
import {getDataFromTree} from '../src/index';
import {testComponent, testComponentNested} from '../__test-helpers__/util';

it('should fetch and render to string with data', async () => {
    const {element: serverElement, getStore} = testComponent({options: {ssrKey: 'unique-key-1'}});
    const data = await getDataFromTree(serverElement, getStore);

    expect(data).toMatchSnapshot();

    const {element: clientElement} = testComponent({initialStore: data, options: {ssrKey: 'unique-key-1'}});
    const content = ReactDOM.renderToStaticMarkup(clientElement);

    expect(content).toBe('<div>foo</div>');
});

it('should fetch data from a nested component', async () => {
    const {element: serverElement, getStore} = testComponentNested({
        syncContainerProps: {ssrKey: 'unique-key-1'},
        container1Props: {ssrKey: 'unique-key-2'},
        container2Props: {ssrKey: 'unique-key-3'},
    });
    const data = await getDataFromTree(serverElement, getStore);

    expect(data).toMatchSnapshot();

    const {element: clientElement} = testComponentNested({
        initialStore: data,
        syncContainerProps: {ssrKey: 'unique-key-1'},
        container1Props: {ssrKey: 'unique-key-2'},
        container2Props: {ssrKey: 'unique-key-3'},
    });
    const content = ReactDOM.renderToStaticMarkup(clientElement);

    expect(content).toBe('<div>2-foobar<button></button></div>');
});
