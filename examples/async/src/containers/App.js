import React from 'react';
import {Priem, createStore} from 'priem';
import Picker from '../components/Picker';
import Posts from '../components/Posts';

const {Container, AsyncContainer} = createStore();

const redditPicker = new Container({reddit: 'reactjs'});

const reddit = new AsyncContainer({
    mapPropsToArgs: props => [props.redditPicker.reddit],
    promise: reddit => {
        return fetch(`https://www.reddit.com/r/${reddit}.json`)
            .then(res => res.json())
            .then(res => res.data.children);
    },
    maxAge: 20000,
    maxArgs: 1,
});

export default class App extends React.Component {
    constructor(props, context) {
        super(props, context);

        this.handleChange = (nextReddit) => {
            redditPicker.setState({reddit: nextReddit});
        };
    }

    render() {
        return (
            <Priem sources={{redditPicker, reddit}}>
                {({redditPicker, reddit, refresh}) => {
                    const {value, lastUpdated} = reddit;
                    const isFetching = reddit.pending || reddit.refreshing;

                    return (
                        <div>
                            <Picker
                                value={redditPicker.reddit}
                                onChange={this.handleChange}
                                options={['reactjs', 'frontend']}
                            />
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
                }}
            </Priem>
        );
    }
}
