export declare function createResource<DataType, Args extends MemoizedKey>(
    fn: (args: Args) => Promise<DataType>,
    resourceOptions?: ResourceOptions,
): {
    (args: Args | undefined, options?: Options): Result<DataType>;
    pages(getArgs: GetArgs<Args> | undefined, options?: Options): ResultPages<DataType>;
};

export declare function flushStore(): [string, MemoizedSerializableCacheItem[]][];

export declare type GetArgs<Args> = (prevArgs?: Args) => Args;

/* Excluded from this release type: getRunningPromises */

export declare function hydrateStore(initialStore: [string, MemoizedSerializableCacheItem[]][]): void;

export declare type MemoizedKey = Readonly<Record<string, unknown>>;

export declare type MemoizedSerializableCacheItem<
    Args extends MemoizedKey = MemoizedKey,
    DataType = unknown
> = SerializableCacheItem<Args, MemoizedValue<DataType>>;

export declare interface MemoizedValue<DataType> {
    status: Status;
    data: DataType | undefined;
    reason?: Error;
    promise?: Promise<void>;
}

export declare interface Options {
    refreshInterval?: number;
    refreshOnMount?: boolean;
}

export declare interface ResourceOptions {
    ssrKey?: string;
}

export declare type Result<DataType> = [DataType | undefined, ResultMeta];

export declare interface ResultMeta {
    pending: boolean;
    fulfilled: boolean;
    rejected: boolean;
    reason: Error | undefined;
    invalidate: () => void;
}

export declare type ResultPages<DataType> = [DataType[] | undefined, ResultPagesMeta];

export declare interface ResultPagesMeta extends ResultMeta {
    loadMore: () => void;
}

export declare interface SerializableCacheItem<K, V> {
    key: K;
    value: V;
}

export declare enum Status {
    PENDING = 0,
    FULFILLED = 1,
    REJECTED = 2,
}

export {};
