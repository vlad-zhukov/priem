import delay from 'delay';
import withPriem from '../src/withPriem';
import render from '../__test-helpers__/render';
import {testComponentDecorated, testComponentNestedDecorated} from '../__test-helpers__/util';

it('should render a simple decorated component', async () => {
    const {element} = testComponentDecorated();
    const {container} = render(element);
    await delay(150);
    expect(container.innerHTML).toMatchInlineSnapshot(`"<div>foo</div>"`);
});

it('should render a nested decorated component', async () => {
    const {element} = testComponentNestedDecorated();
    const {container} = render(element);
    await delay(300);
    expect(container.innerHTML).toMatchInlineSnapshot(`"<div>foobar</div>"`);
});

it("should throw if 'component' prop exists", () => {
    expect(() => withPriem({component: () => {}})).toThrow();
});

it("should throw if 'children' prop exists", () => {
    expect(() => withPriem({children: () => {}})).toThrow();
});
