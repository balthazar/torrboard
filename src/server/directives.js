// Schema-level @auth and @hasRole enforcement. SchemaDirectiveVisitor was
// removed from graphql-tools in v7+, so directives now apply via mapSchema:
// each OBJECT_FIELD that carries @auth or @hasRole gets its resolver wrapped
// with the same authenticate/checkRole gates the old visitor used.
const { mapSchema, getDirective, MapperKind } = require('@graphql-tools/utils')
const { defaultFieldResolver } = require('graphql')

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

const applyDirectives = schema =>
  mapSchema(schema, {
    [MapperKind.OBJECT_FIELD]: fieldConfig => {
      const authDir = getDirective(schema, fieldConfig, 'auth')
      const roleDir = getDirective(schema, fieldConfig, 'hasRole')
      if (!authDir && !roleDir) return undefined

      const role = roleDir && roleDir[0] && roleDir[0].role
      const hasOwnResolve = !!fieldConfig.resolve
      const { resolve = defaultFieldResolver } = fieldConfig

      fieldConfig.resolve = (root, args, context, info) => {
        authenticate(context)

        if (role) {
          try {
            checkRole(context, role)
          } catch (err) {
            // Preserve legacy behaviour: when a @hasRole field has no
            // resolver of its own, hide it (null) instead of raising; when
            // it does, propagate the error.
            if (!hasOwnResolve) return null
            throw err
          }
        }

        return resolve(root, args, context, info)
      }

      return fieldConfig
    },
  })

module.exports = { applyDirectives }
