const { SchemaDirectiveVisitor } = require('graphql-tools')
const {
  DirectiveLocation,
  GraphQLDirective,
  defaultFieldResolver,
  GraphQLString,
} = require('graphql')

class AuthError extends Error {
  constructor(message = 'Get the fuck out.', code = 401) {
    super(message)
    this.code = code
  }
}

const authenticate = ({ user }) => {
  if (!user) {
    throw new AuthError()
  }
}

const checkRole = ({ user }, requiredRole) => {
  if (user.name !== requiredRole) {
    throw new AuthError('Ur a trash haxxor bitchass pussy cucklord')
  }
}

class auth extends SchemaDirectiveVisitor {
  static getDirectiveDeclaration(directiveName = 'auth') {
    return new GraphQLDirective({
      name: directiveName,
      locations: [DirectiveLocation.FIELD_DEFINITION],
    })
  }

  visitFieldDefinition(field) {
    const { resolve = defaultFieldResolver } = field

    field.resolve = (root, args, context, info) => {
      authenticate(context)
      return resolve.call(this, root, args, context, info)
    }
  }
}

class hasRole extends SchemaDirectiveVisitor {
  static getDirectiveDeclaration(directiveName = 'hasRole') {
    return new GraphQLDirective({
      name: directiveName,
      locations: [DirectiveLocation.FIELD_DEFINITION],
      args: {
        role: { type: GraphQLString },
      },
    })
  }

  visitFieldDefinition(field) {
    const { resolve = defaultFieldResolver } = field

    const hasResolveFn = field.resolve !== undefined

    field.resolve = (root, args, context, info) => {
      authenticate(context)
      try {
        checkRole(context, this.args.role)
      } catch (error) {
        if (!hasResolveFn) {
          return null
        }

        throw error
      }

      return resolve.call(this, root, args, context, info)
    }
  }
}

module.exports = {
  auth,
  hasRole,
}
