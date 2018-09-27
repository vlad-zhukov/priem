import React from 'react';
import PropTypes from 'prop-types';

const Posts = ({posts}) => (
    <ol>
        {posts.map((post, i) => (
            // eslint-disable-next-line react/no-array-index-key
            <li key={i + post.data.title.substring(0, 10)}>{post.data.title}</li>
        ))}
    </ol>
);

Posts.propTypes = {
    posts: PropTypes.array.isRequired, // eslint-disable-line react/forbid-prop-types
};

export default Posts;
