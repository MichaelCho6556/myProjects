import {
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLString,
  GraphQLList,
  GraphQLNonNull,
} from "graphql";
import {
  getDocuments,
  getDocumentById,
  addDocument,
  searchDocuments,
} from "./resolvers";
import { DocumentType } from "../types/document";

const RootQueryType = new GraphQLObjectType({
  name: "Query",
  description: "Root Query",
  fields: () => ({
    documents: {
      type: new GraphQLList(DocumentType),
      description: "List of all Documents",
      resolve: getDocuments,
    },
    document: {
      type: DocumentType,
      description: "Get a single document by ID",
      args: {
        id: { type: GraphQLNonNull(GraphQLString) },
      },
      resolve: (parent, args) => getDocumentById(args),
    },
    searchDocuments: {
      type: new GraphQLList(DocumentType),
      description: "Search for documents by text content",
      args: {
        query: { type: GraphQLNonNull(GraphQLString) },
      },
      resolve: (parent, args) => searchDocuments(args),
    },
  }),
});

const RootMutationType = new GraphQLObjectType({
  name: "Mutation",
  description: "Root Mutations",
  fields: () => ({
    addDocument: {
      type: DocumentType,
      description: "Add a document",
      args: {
        filename: { type: GraphQLNonNull(GraphQLString) },
      },
      resolve: (parent, args) => addDocument(args),
    },
  }),
});

export const schema = new GraphQLSchema({
  query: RootQueryType,
  mutation: RootMutationType,
});
