import React from 'react';

export type Post = {
    data: {
        title: string;
    };
};

type PostsProps = {
    posts: Post[];
};

const Posts: React.FunctionComponent<PostsProps> = ({posts}) => (
    <ol>
        {posts.map((post, i) => (
            // eslint-disable-next-line react/no-array-index-key
            <li key={i + post.data.title.substring(0, 10)}>{post.data.title}</li>
        ))}
    </ol>
);

export default Posts;
