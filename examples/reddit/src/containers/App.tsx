import * as React from 'react';
import {usePriem, Resource} from 'priem';
import Picker from '../components/Picker';
import Posts, {Post} from '../components/Posts';

const redditContainer = new Resource(
    reddit =>
        fetch(`https://www.reddit.com/r/${reddit}.json`)
            .then(res => res.json())
            .then(res => res.data.children),
    {
        maxSize: 2,
        maxAge: 10000,
    }
);

export default () => {
    const [redditName, setReddit] = React.useState('reactjs');

    const reddit = usePriem<Post[]>(redditContainer, [redditName]);

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
