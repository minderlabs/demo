'use strict';

export class Search {
    constructor() {
        //TODO: connect to actual datastore
    }

    search(term) {
        results = [];
        for (i in [...Array(10).keys()]) {
            results.push(term+i);
        }
        return results;
    }
}
