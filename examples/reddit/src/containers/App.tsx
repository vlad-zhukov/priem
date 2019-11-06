import * as React from 'react';
import {createResource} from 'priem';
import Picker from '../components/Picker';
import Posts, {Post} from '../components/Posts';

const useRedditContainer = createResource<Post[], {reddit: string}>(
    ({reddit}) =>
        fetch(`https://www.reddit.com/r/${reddit}.json`)
            .then(res => res.json())
            .then(res => res.data.children),
    {
        maxSize: 2,
        maxAge: 10000,
    },
);

export default () => {
    const [redditName, setReddit] = React.useState('reactjs');
    const [reddit, {pending, refresh}] = useRedditContainer({reddit: redditName});

    return (
        <div>
            <Picker value={redditName} onChange={setReddit} options={['reactjs', 'frontend']} />
            <p>{reddit && <button onClick={refresh}>Refresh</button>}</p>
            {reddit ? (
                <div style={{opacity: pending ? 0.5 : 1}}>
                    <Posts posts={reddit} />
                </div>
            ) : (
                <h2>Loading...</h2>
            )}
        </div>
    );
};
