import React from 'react';
import {Priem, Container} from 'priem';
import Picker from '../components/Picker';
import Posts from '../components/Posts';

const reddit = new Container({
    mapPropsToArgs: props => [props.redditName],
    promise: reddit => {
        return fetch(`https://www.reddit.com/r/${reddit}.json`)
            .then(res => res.json())
            .then(res => res.data.children);
    },
    maxSize: 2,
    maxAge: 10000,
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
            <div>
                <Picker value={this.state.reddit} onChange={this.handleChange} options={['reactjs', 'frontend']} />
                <Priem redditName={this.state.reddit} sources={{reddit}}>
                    {({reddit, refresh}) => {
                        const {data, status} = reddit;

                        return (
                            <>
                                <p>{data && <button onClick={refresh}>Refresh</button>}</p>
                                {data ? (
                                    <div style={{opacity: status === 0 ? 0.5 : 1}}>
                                        <Posts posts={data} />
                                    </div>
                                ) : (
                                    <h2>Loading...</h2>
                                )}
                            </>
                        );
                    }}
                </Priem>
            </div>
        );
    }
}
