import { GraphQLObjectType, GraphQLString } from "graphql";

export const DocumentType = new GraphQLObjectType({
  name: "Document",
  description: "This represents a document",
  fields: () => ({
    id: { type: GraphQLString },
    filename: { type: GraphQLString },
    s3Key: { type: GraphQLString },
    uploadDate: { type: GraphQLString },
    extractedText: { type: GraphQLString },
  }),
});
