export declare function createResource<DataType, Args extends MemoizedKey>(
    fn: (args: Args) => Promise<DataType>,
    resourceOptions?: ResourceOptions,
): (args: Args | undefined, options?: Options) => Result<DataType>;

export declare function flushStore(): [string, MemoizedSerializableCacheItem[]][];

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
    maxAge?: number;
    refreshOnMount?: boolean;
}

export declare interface ResourceOptions {
    maxSize?: number;
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
