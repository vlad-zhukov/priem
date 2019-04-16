/* Excluded from this release type: __INTERNALS__ */

export declare function createResource<DataType, Args extends MemoizedKey = []>(
    fn: (...args: Args) => Promise<unknown>,
    options?: ResourceOptions
): (args: Args | null) => [DataType | undefined, ResultMeta];

export declare function flushStore(): [string, MemoizedSerializableCacheItem[]][];

export declare type MemoizedKey = unknown[];

export declare type MemoizedSerializableCacheItem = SerializableCacheItem<MemoizedKey, MemoizedValue>;

export declare interface MemoizedValue {
    status: STATUS;
    data: unknown;
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
    reason?: Error;
    refresh: () => void;
}

export declare interface SerializableCacheItem<K = unknown, V = unknown> {
    key: K;
    value: V;
}

export declare enum STATUS {
    PENDING = 0,
    FULFILLED = 1,
    REJECTED = 2,
}

export {};
