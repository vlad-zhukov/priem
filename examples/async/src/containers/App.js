import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {Priem, propTypes} from 'priem';
import Picker from '../components/Picker';
import Posts from '../components/Posts';

class App extends Component {
    static propTypes = {
        priem: PropTypes.shape({
            reddit: PropTypes.string,
            reactjs: PropTypes.shape(propTypes.promiseState),
            frontend: PropTypes.shape(propTypes.promiseState),
        }).isRequired,
        setPriem: PropTypes.func.isRequired,
        refresh: PropTypes.func.isRequired,
    };

    constructor(props, context) {
        super(props, context);

        this.handleChange = (nextReddit) => {
            this.props.setPriem({reddit: nextReddit});
        };
    }

    render() {
        const {priem, refresh} = this.props;
        const {pending, refreshing, value, lastUpdated} = priem[priem.reddit] || {};
        const isFetching = pending || refreshing;

        return (
            <div>
                <Picker value={priem.reddit} onChange={this.handleChange} options={['reactjs', 'frontend']} />
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

export default () => (
    <Priem
        component={App}
        name="Async"
        autoRefresh
        initialValues={{reddit: 'reactjs'}}
        asyncValues={props => ({
            [props.priem.reddit]: {
                args: [props.priem.reddit],
                promise: reddit => {
                    return fetch(`https://www.reddit.com/r/${reddit}.json`)
                        .then(res => res.json())
                        .then(res => res.data.children);
                },
                maxAge: 20000,
                maxArgs: 1,
            },
        })}
    />
);
