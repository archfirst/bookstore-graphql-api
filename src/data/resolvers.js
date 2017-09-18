import axios from 'axios';
import { PubSub } from 'graphql-subscriptions';
import { config } from '../config';

// ------------------------------------------------------------------------------------------------
// Create a PubSub instance
// ------------------------------------------------------------------------------------------------
export const pubsub = new PubSub();

// ------------------------------------------------------------------------------------------------
// Resolvers
// ------------------------------------------------------------------------------------------------
export const resolvers = {
    Query: {
        authors() {
            return axios
                .get(config.dbApi.authors)
                .then(response => response.data);
        },

        author(root, args) {
            return axios
                .get(`${config.dbApi.authors}/${args.id}`)
                .then(response => response.data);
        },

        publishers() {
            return axios
                .get(config.dbApi.publishers)
                .then(response => response.data);
        },

        publisher(root, args) {
            return axios
                .get(`${config.dbApi.publishers}/${args.id}`)
                .then(response => response.data);
        },

        books() {
            return axios
                .get(config.dbApi.books)
                .then(response => response.data);
        },

        book(root, args) {
            return axios
                .get(`${config.dbApi.books}/${args.id}`)
                .then(response => response.data);
        }
    },

    Author: {
        books(author) {
            return axios
                .get(config.dbApi.bookAuthors, {
                    params: {
                        authorId: author.id
                    }
                })
                .then(response => {
                    const bookAuthors = response.data;
                    const promises = bookAuthors.map(bookAuthor => {
                        return axios
                            .get(`${config.dbApi.books}/${bookAuthor.bookId}`)
                            .then(response => response.data);
                    });
                    return Promise.all(promises);
                });
        }
    },

    Publisher: {
        books(publisher) {
            return axios
                .get(config.dbApi.books, {
                    params: {
                        publisherId: publisher.id
                    }
                })
                .then(response => response.data);
        }
    },

    Book: {
        publisher(book) {
            return axios
                .get(`${config.dbApi.publishers}/${book.publisherId}`)
                .then(response => response.data);
        },
        authors(book) {
            return axios
                .get(config.dbApi.bookAuthors, {
                    params: {
                        bookId: book.id
                    }
                })
                .then(response => {
                    const bookAuthors = response.data;
                    const promises = bookAuthors.map(bookAuthor => {
                        return axios
                            .get(
                                `${config.dbApi.authors}/${bookAuthor.authorId}`
                            )
                            .then(response => response.data);
                    });
                    return Promise.all(promises);
                });
        }
    },

    Mutation: {
        createAuthor(root, { id, name }) {
            return axios
                .post(config.dbApi.authors, { id, name })
                .then(response => {
                    const author = response.data;
                    pubsub.publish('authorAdded', {
                        authorAdded: author
                    });
                    return author;
                });
        },

        createPublisher(root, { id, name }) {
            return axios
                .post(config.dbApi.publishers, { id, name })
                .then(response => {
                    const publisher = response.data;
                    pubsub.publish('publisherAdded', {
                        publisherAdded: publisher
                    });
                    return publisher;
                });
        },

        updatePublisher(root, { id, name }) {
            return axios
                .put(`${config.dbApi.publishers}/${id}`, { id, name })
                .then(response => response.data);
        },

        createBook(root, { id, name, publisherId, authorIds }) {
            return axios
                .post(config.dbApi.books, { id, name, publisherId })
                .then(() => {
                    const bookId = id;
                    return Promise.all(
                        authorIds.map(authorId =>
                            axios.post(config.dbApi.bookAuthors, {
                                id: `${bookId}-${authorId}`,
                                bookId: bookId,
                                authorId: authorId
                            })
                        )
                    );
                })
                .then(() => {
                    const book = { id, name, publisherId };
                    pubsub.publish('bookAdded', {
                        bookAdded: book
                    });
                    return book;
                });
        }
    },

    Subscription: {
        authorAdded: {
            subscribe: () => pubsub.asyncIterator('authorAdded')
        },
        publisherAdded: {
            subscribe: () => pubsub.asyncIterator('publisherAdded')
        },
        bookAdded: {
            subscribe: () => pubsub.asyncIterator('bookAdded')
        }
    }
};
