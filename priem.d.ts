/* Excluded from this release type: __INTERNALS__ */

export declare function createResource<DataType, Args extends MemoizedKey>(
    fn: (args: Args) => Promise<DataType>,
    options?: CreateResourceOptions
): (args: Args | null) => [DataType | undefined, ResultMeta];

export declare interface CreateResourceOptions extends ResourceOptions {
    refreshOnMount?: boolean;
}

export declare function flushStore(): [string, MemoizedSerializableCacheItem[]][];

export declare type MemoizedKey = Readonly<Record<string, unknown>>;

export declare type MemoizedSerializableCacheItem<
    Args extends MemoizedKey = MemoizedKey,
    DataType = unknown
> = SerializableCacheItem<Args, MemoizedValue<DataType>>;

export declare interface MemoizedValue<DataType> {
    status: STATUS;
    data: DataType | undefined;
    reason?: Error;
    promise?: Promise<void>;
}

export declare function populateStore(initialStore: [string, MemoizedSerializableCacheItem[]][]): void;

export declare interface ResourceOptions {
    maxSize?: number;
    maxAge?: number;
    ssrKey?: string;
}

export declare type Result<DataType> = [DataType | undefined, ResultMeta];

export declare interface ResultMeta {
    pending: boolean;
    fulfilled: boolean;
    rejected: boolean;
    reason: Error | undefined;
    refresh: () => void;
}

export declare interface SerializableCacheItem<K, V> {
    key: K;
    value: V;
}

export declare enum STATUS {
    PENDING = 0,
    FULFILLED = 1,
    REJECTED = 2,
}

export {};
