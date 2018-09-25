import React from 'react';
import {Priem, Container} from 'priem';
import Picker from '../components/Picker';
import Posts from '../components/Posts';

const reddit = new Container({
    mapPropsToArgs: props => [props.reddit],
    promise: reddit => {
        return fetch(`https://www.reddit.com/r/${reddit}.json`)
            .then(res => res.json())
            .then(res => res.data.children);
    },
    maxSize: 2,
    maxAge: 20000,
});

export default class App extends React.Component {
    constructor(props) {
        super(props);

        this.state = {reddit: 'reactjs'};

        this.handleChange = nextReddit => {
            this.setState({reddit: nextReddit});
        };
    }

    render() {
        return (
            <Priem reddit={this.state.reddit} sources={{reddit}}>
                {({reddit, refresh}) => {
                    const {value, lastUpdated} = reddit;
                    const isFetching = reddit.pending || reddit.refreshing;

                    return (
                        <div>
                            <Picker
                                value={this.state.reddit}
                                onChange={this.handleChange}
                                options={['reactjs', 'frontend']}
                            />
                            <p>
                                {lastUpdated && (
                                    <span>Last updated at {new Date(lastUpdated).toLocaleTimeString()}. </span>
                                )}
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
