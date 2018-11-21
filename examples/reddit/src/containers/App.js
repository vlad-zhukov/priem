import React from 'react';
import {usePriem, Container} from 'priem';
import Picker from '../components/Picker';
import Posts from '../components/Posts';

const redditContainer = new Container({
    promise: reddit => {
        return fetch(`https://www.reddit.com/r/${reddit}.json`)
            .then(res => res.json())
            .then(res => res.data.children);
    },
    maxSize: 2,
    maxAge: 10000,
});

export default () => {
    const [redditName, setReddit] = React.useState('reactjs');

    const reddit = usePriem(redditContainer, [redditName]);

    return (
        <div>
            <Picker value={redditName} onChange={setReddit} options={['reactjs', 'frontend']} />
            <p>{reddit.data && <button onClick={reddit.refresh}>Refresh</button>}</p>
            {reddit.data ? (
                <div style={{opacity: reddit.pending ? 0.5 : 1}}>
                    <Posts posts={reddit.data} />
                </div>
            ) : (
                <h2>Loading...</h2>
            )}
        </div>
    );
};
