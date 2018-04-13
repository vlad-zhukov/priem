import React from 'react';
import PropTypes from 'prop-types';
import {Priem, createStore, propTypes} from 'priem';
import Picker from '../components/Picker';
import Posts from '../components/Posts';

const {Container, AsyncContainer} = createStore();

const redditPicker = new Container({reddit: 'reactjs'});

const reddit = new AsyncContainer(props => ({
    args: [props.redditPicker.reddit],
    promise: reddit => {
        return fetch(`https://www.reddit.com/r/${reddit}.json`)
            .then(res => res.json())
            .then(res => res.data.children);
    },
    maxAge: 20000,
    maxArgs: 1,
}));

class App extends React.Component {
    static propTypes = {
        redditPicker: PropTypes.shape({reddit: PropTypes.string}).isRequired,
        reddit: PropTypes.shape(propTypes.promiseState).isRequired,
        // setPriem: PropTypes.func.isRequired,
        // refresh: PropTypes.func.isRequired,
    };

    constructor(props, context) {
        super(props, context);

        this.handleChange = (nextReddit) => {
            redditPicker.setState({reddit: nextReddit});
        };
    }

    render() {
        const {redditPicker, reddit, refresh} = this.props;
        const {value, lastUpdated} = reddit;
        const isFetching = reddit.pending || reddit.refreshing;

        return (
            <div>
                <Picker value={redditPicker.reddit} onChange={this.handleChange} options={['reactjs', 'frontend']} />
                <p>
                    {lastUpdated && <span>Last updated at {new Date(lastUpdated).toLocaleTimeString()}. </span>}
                    {!isFetching && <button onClick={refresh}>Refresh</button>}
                </p>
                {!value ? ( // eslint-disable-line no-nested-ternary
                    isFetching ? (
                        <h2>Loading...</h2>
                    ) : (
                        <h2>Empty.</h2>
                    )
                ) : (
                    <div style={{opacity: isFetching ? 0.5 : 1}}>
                        <Posts posts={value} />
                    </div>
                )}
            </div>
        );
    }
}

export default () => <Priem sources={{redditPicker, reddit}} component={App}/>;
