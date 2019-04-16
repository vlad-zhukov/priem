
/* Excluded from this release type: __INTERNALS__ */

export declare function createResource<DataType, Args extends MemoizedKey = []>(fn: (...args: Args) => Promise<unknown>, options?: ResourceOptions): (args: Args | null) => [DataType | null, ResultMeta];

export declare function flushStore(): [string, MemoizedSerializableCacheItem[]][];

declare type MemoizedKey = unknown[];

declare type MemoizedSerializableCacheItem = SerializableCacheItem<MemoizedKey, MemoizedValue>;

declare interface MemoizedValue {
    status: STATUS;
    data: unknown;
    reason: Error | null;
    promise?: Promise<void>;
}

export declare function populateStore(initialStore: [string, MemoizedSerializableCacheItem[]][]): void;

declare interface ResourceOptions {
    maxSize?: number;
    maxAge?: number;
    ssrKey?: string;
}

declare interface ResultMeta {
    pending: boolean;
    fulfilled: boolean;
    rejected: boolean;
    reason: Error | null;
    refresh: () => void;
}

declare interface SerializableCacheItem<K = unknown, V = unknown> {
    key: K;
    value: V;
}

declare enum STATUS {
    PENDING = 0,
    FULFILLED = 1,
    REJECTED = 2
}

export { }
