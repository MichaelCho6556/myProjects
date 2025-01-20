import {
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLString,
  GraphQLList,
  GraphQLNonNull,
} from "graphql";
import { getDocuments, addDocument } from "./resolvers";
import { DocumentType } from "../types/document";

const RootQueryType = new GraphQLObjectType({
  name: "Query",
  description: "Root Query",
  fields: () => ({
    documents: {
      type: new GraphQLList(DocumentType),
      description: "List of Documents",
      resolve: getDocuments,
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
      resolve: addDocument,
    },
  }),
});

export const schema = new GraphQLSchema({
  query: RootQueryType,
  mutation: RootMutationType,
});
