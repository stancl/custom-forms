const tap = require('lodash/tap')
const map = require('lodash/map')
const toPairs = require('lodash/toPairs')
const fromPairs = require('lodash/fromPairs')
const mergeWith = require('lodash/mergeWith')
const flatMap = require('lodash/flatMap')
const isEmpty = require('lodash/isEmpty')
const isArray = require('lodash/isArray')
const isFunction = require('lodash/isFunction')
const isUndefined = require('lodash/isUndefined')
const isPlainObject = require('lodash/isPlainObject')
const defaultOptions = require('./defaultOptions')
const svgToDataUri = require('mini-svg-data-uri')
const traverse = require('traverse')
const omit = require('lodash/omit');

function merge(...options) {
  function mergeCustomizer(objValue, srcValue, key, obj, src, stack) {
    if (isPlainObject(srcValue)) {
      return mergeWith(objValue, srcValue, mergeCustomizer)
    }
    return Object.keys(src).includes(key)
      // Convert undefined to null otherwise lodash won't replace the key
      // PostCSS still omits properties with a null value so it behaves
      // the same as undefined.
      ? (srcValue === undefined ? null : srcValue)
      : objValue
  }

  return mergeWith({}, ...options, mergeCustomizer)
}

function flattenOptions(options) {
  return merge(...flatMap(toPairs(options), ([keys, value]) => {
    return fromPairs(keys.split(', ').map(key => [key, value]))
  }))
}

function resolveOptions(userOptions) {
  return merge({
    default: defaultOptions,
  }, fromPairs(map(userOptions, (value, key) => [key, flattenOptions(value)])))
}

function replaceIconDeclarations(component, replace) {
  return traverse(component).map(function (value) {
    if (!isPlainObject(value)) {
      return
    }

    if (Object.keys(value).includes('iconColor') || Object.keys(value).includes('icon')) {
      const { iconColor, icon, ...rest } = value
      this.update(merge(replace({ icon, iconColor }), rest))
    }
  })
}

module.exports = function ({ addUtilities, addComponents, theme, postcss }) {
  function addInput(options, selector = null) {
    selector = selector || options.selector;
    if (isEmpty(options)) {
      return
    }

    addComponents({ [selector]: omit(options, ['selector', 'baseClass']) }, { respectPrefix: false })
  }

  function addTextarea(options, selector = null) {
    selector = selector || options.selector;
    if (isEmpty(options)) {
      return
    }

    addComponents({ [selector]: omit(options, ['selector', 'baseClass']) }, { respectPrefix: false })
  }

  function addMultiselect(options, selector = null) {
    selector = selector || options.selector;
    if (isEmpty(options)) {
      return
    }

    addComponents({ [selector]: omit(options, ['selector', 'baseClass']) }, { respectPrefix: false })
  }

  function addSelect(options, selector = null) {
    selector = selector || options.selector;
    if (isEmpty(options)) {
      return
    }

    addComponents(replaceIconDeclarations({
      [selector]: merge({
        '&::-ms-expand': {
          color: options.iconColor,
        },
        ...isUndefined(options.paddingLeft) ? {} : {
          '@media print and (-ms-high-contrast: active), print and (-ms-high-contrast: none)': {
            paddingRight: options.paddingLeft, // Fix padding for print in IE
          },
        },
      }, omit(options, ['selector', 'baseClass']))
    }, ({ icon = options.icon, iconColor = options.iconColor }) => {
      return {
        backgroundImage: `url("${svgToDataUri(isFunction(icon) ? icon(iconColor) : icon)}")`
      }
    }), { respectPrefix: false })
  }

  function addCheckbox(options, selector = null) {
    selector = selector || options.selector;
    if (isEmpty(options)) {
      return
    }

    addComponents(replaceIconDeclarations({
      [selector]: merge({
        ...isUndefined(options.borderWidth) ? {} : {
          '&::-ms-check': {
            '@media not print': {
              borderWidth: options.borderWidth,
            }
          },
        },
      }, omit(options, ['selector', 'baseClass']))
    }, ({ icon = options.icon, iconColor = options.iconColor }) => {
      return {
        '&:checked': {
          backgroundImage: `url("${svgToDataUri(isFunction(icon) ? icon(iconColor) : icon)}")`
        }
      }
    }), { respectPrefix: false })
  }

  function addRadio(options, selector = null) {
    selector = selector || options.selector;
    if (isEmpty(options)) {
      return
    }

    addComponents(replaceIconDeclarations({
      [selector]: merge({
        ...isUndefined(options.borderWidth) ? {} : {
          '&::-ms-check': {
            '@media not print': {
              borderWidth: options.borderWidth,
            }
          },
        },
      }, omit(options, ['selector', 'baseClass']))
    }, ({ icon = options.icon, iconColor = options.iconColor }) => {
      return {
        '&:checked': {
          backgroundImage: `url("${svgToDataUri(isFunction(icon) ? icon(iconColor) : icon)}")`
        }
      }
    }), { respectPrefix: false })
  }

  function registerComponents() {
    const options = resolveOptions(theme('customForms'))

    addInput(options.default.input)
    addTextarea(options.default.textarea)
    addMultiselect(options.default.multiselect)
    addSelect(options.default.select)
    addCheckbox(options.default.checkbox)
    addRadio(options.default.radio)

    Object.keys((({ default: _default, ...rest }) => rest)(options)).forEach(key => {
      const selector = `${options[key].baseClass}-${key}`

      addInput(options[key].input || {}, selector)
      addTextarea(options[key].textarea || {}, selector)
      addMultiselect(options[key].multiselect || {}, selector)
      addSelect(options[key].select || {}, selector)
      addCheckbox(options[key].checkbox || {}, selector)
      addRadio(options[key].radio || {}, selector)
    })
  }

  registerComponents()
}
