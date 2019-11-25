import * as React from 'react';
import {createResource} from 'priem';
import Picker from '../components/Picker';
import Posts, {Post} from '../components/Posts';

const useRedditContainer = createResource<Post[], {reddit: string; count: number}>(({reddit, count}) =>
    fetch(`https://www.reddit.com/r/${reddit}.json?limit=10&count=${count}`)
        .then(res => res.json())
        .then(res => res.data.children),
);

export default () => {
    const [redditName, setReddit] = React.useState('reactjs');
    const [reddit, meta] = useRedditContainer.pages(
        prevArgs => ({reddit: redditName, count: prevArgs ? prevArgs.count + 10 : 10}),
        {refreshInterval: 10000},
    );

    return (
        <div>
            <Picker value={redditName} onChange={setReddit} options={['reactjs', 'frontend']} />
            <p>{reddit && <button onClick={meta.invalidate}>Refresh</button>}</p>
            {reddit ? (
                <div style={{opacity: meta.pending ? 0.5 : 1}}>
                    <Posts posts={reddit.reduce((acc, val) => acc.concat(val), [])} />
                    <button onClick={meta.loadMore}>Load more</button>
                </div>
            ) : (
                <h2>Loading...</h2>
            )}
        </div>
    );
};
