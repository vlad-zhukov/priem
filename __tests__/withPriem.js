import delay from 'delay';
import {mount} from 'enzyme';
import {createSerializer} from 'enzyme-to-json';
import withPriem from '../src/withPriem';
import {testComponentDecorated, testComponentNestedDecorated} from '../__test-helpers__/util';

expect.addSnapshotSerializer(createSerializer({mode: 'deep'}));

it('should render a simple decorated component', async () => {
    const {element} = testComponentDecorated();
    const wrapper = mount(element);
    await delay(150);
    wrapper.update();
    expect(wrapper).toMatchSnapshot();
});

it('should render a nested decorated component', async () => {
    const {element} = testComponentNestedDecorated();
    const wrapper = mount(element);
    await delay(300);
    wrapper.update();
    expect(wrapper).toMatchSnapshot();
});

it("should throw if 'render' prop exists", () => {
    expect(() => withPriem({render: () => {}})).toThrow();
});

it("should throw if 'component' prop exists", () => {
    expect(() => withPriem({component: () => {}})).toThrow();
});

it("should throw if 'children' prop exists", () => {
    expect(() => withPriem({children: () => {}})).toThrow();
});
