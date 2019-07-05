'use strict'

import invariant from 'invariant'
import * as u from './util'

/**
 * @namespace
 *
 * Use these props ffor name s
 */
export const props = {
  /** Property name identifying a reference to a slot */
  extOf: '@@skele/extOf',
  /** Property name identifying a the extension factory */
  ext: '@@skele/ext',
  /** Property name identifying a dependencies object */
  deps: '@@skele/deps',
  /** Property name identifting a query filter function */
  qFilter: '@@skele/qFilter',
  /** Priperty name identifying a wether a single extension is requested */
  one: '@@skele/one',
}

/**
 * @typedef Extension - an extension object.
 *
 * Extension objects are central to skele/system. They declare a contribution to
 * an extension slot.
 *
 * @property {symbol} @@skele/extOf - the extenson slot for this extension
 * @property {ExtensionFactory} @@skele/ext - the factory function that is
 * used to produce the extension
 * @property {Deps} [@@skele/deps] - the depedency declearationffor
 */

/**
 * @callback ExtensionFactory - a factory function used to create the extension.
 *
 * @param {Object} deps - an object of realized dependencies for the extension extension.
 * @returns {*} - the extension, can be anything
 */

/**
 * @typedef {Object.<string, Query>} Deps - a dependencies declaration.
 *
 * A dependency declaration is a specification of requirements of an extension.
 * It is an map (object) interpredet in the following way:
 * - the key is the name under which the resolved dependency (or dependencies)
 *   will be provided to the factory functon
 * - the value itself is a Query
 */

/**
 * @typedef {TerseQuery|CanonicalQuery} Query
 *
 * A deps query can have be in a terse or canonical form.
 */

/**
 * @typedef {symbol|[symbol]|[symbol, QFilter]} TerseQuery
 *
 * The terse query format is the one normally used by end users to specify a
 * query. It can have the following forms:
 * - sym   - meaning "the only extensions contributed to the slot sym". If more
 *   than one are found, an error is raised during construction of the extension.
 * - [sym] - meaning "all extensions contributed to the extension slot sym"
 * - [sym, pred] - meaining "all extensions contributed to the extension slot
 *   sym that match the predicate pred"
 */

/**
 * @callback QFilter - a predicate fn  that returns true the provided extension
 * satisfies itt condition
 * @param {Extension} ext - the extension
 * @returns {boolean}
 */

/**
 * @typedef {Object} CanonicalQuery
 *
 * The canonical query format is used internlly by the lbirary.
 *
 * @property {symbol} @@skele/extOf - the symbol identifying the extenson slot
 * @property {QFilter} @@skele/qFilter - the predicate filtering the list of predicates
 * @property {boolean} @@skele/one - a property signifuying whether the query is
 * looking for just one extension
 */

/**
 * Creates an extenions of the provided slot with the provided factory.
 *
 * Tis is the most basic DSL for creating an extension object.
 *
 * @param {symbol} slot the slot this extension contributes to
 * @param {ExtensionFactory} factory the factory-fn used to build the extensions
 */
export const ext = (slot, factory) => {
  invariant(typeof factory === 'function', 'The factory must be a function')

  return {
    [props.extOf]: slot,
    [props.ext]: factory,
  }
}
/**
 * @callback UpdateFn
 * @param {*} v
 * @returns {*} value
 */
/**
 * DSL function that modifies the property prop of each ext in exts.
 *
 * This is the most basic DSL fn used to modify extensions.
 *
 * @param {string} prop the property to be modified
 * @param {*} [notFound] an optional value to be used if an ext doesn't have a
 * value under prop
 * @param {UpdateFn} f the update function that does the modification
 * @param {Extension[]|Extension} exts an array of exts or a single ext
 * @returns {Extension[]|Extension} the modified extensioons (or a single one,
 * if a single one was provided)
 */
export const modify = (prop, notFound, f, exts) => {
  if (exts == null) {
    exts = f
    f = notFound
    notFound = undefined
  }

  const upd = e => {
    const v = e[prop] == null ? notFound : e[prop]
    return {
      ...e,
      [prop]: f(v),
    }
  }

  return Array.isArray(exts) ? exts.map(upd) : upd(exts)
}

/**
 * Adds a set of deps to the provided ext (or exts)
 * @param {Deps} deps the set of deps to be added
 * @param {Extension[]|Extension} exts the extenison(s) to be modified
 */
export const using = (deps, exts) =>
  modify(props.deps, {}, ds => ({ ...ds, ...parseDeps(deps) }), exts)

// queries
const every = () => true

/**
 * Parses a potentionally terse query into a caonooica.
 *
 * @param {Query} q the query to be parsed
 * @returns {CanonicalQuery} the canonical version of that query
 */
export const parseQuery = q => {
  if (u.isSymbol(q)) {
    return {
      [props.extOf]: q,
      [props.one]: true,
      [props.qFilter]: every,
    }
  } else if (
    Array.isArray(q) &&
    q.length >= 0 &&
    q.length <= 2 &&
    u.isSymbol(q[0])
  ) {
    return {
      [props.extOf]: q[0],
      [props.one]: false,
      [props.qFilter]: q[1] != null ? q[1] : every,
    }
  } else if (q[ext] != null) {
    return q
  }

  invariant(`Invalid query ${q}`, true)
}
/**
 * Parses a Deps object's queries into their canonical version.
 *
 * @function
 * @param {Deps} deps - a set of dependencies
 * @return {Deps} the same object but with canonical querys
 */
export const parseDeps = u.mapObjVals(parseQuery)

/**
 * Gets the dependency declaration out of the extensions.
 * @function
 * @param {Extension} - the extension
 * @returns {Deps}
 */
export const deps = u.propg(props.deps)

/**
 * Gets the extension slot to which the ext is pointing to.
 * @function
 * @param {Extension} ext - the extesion
 * @returns {symbol} the extension slot
 */
export const extSlot = u.propg(props.extOf)
/**
 * Gets the extension factory for the specified ext.
 * @function
 * @param {Extension} ext - the extension
 * @returns {ExtensionFactory}
 */
export const extFactory = u.propg(props.ext)

export const select = (query, exts) => {
  invariant(
    Array.isArray(query) && query.length === 2,
    'The query must be a tuple'
  )
  const [ext, pred] = query

  return u.isEmpty(exts)
    ? []
    : exts.filter(e => e[props.extOf] === ext && pred(e))
}

export const selectFirst = (query, exts) => u.first(select(query, exts))
