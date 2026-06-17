const TOKEN_KEY = 'cashier_token'
const USER_INFO_KEY = 'cashier_user_info'
const REMEMBER_KEY = 'cashier_remember'
const STORE_ID_KEY = 'cashier_store_id'
const STORE_CODE_KEY = 'cashier_store_code'
const STORE_NAME_KEY = 'cashier_store_name'
const USER_TYPE_KEY = 'cashier_user_type'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || ''
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function removeToken() {
  localStorage.removeItem(TOKEN_KEY)
}

export function getUserInfo() {
  const userInfo = localStorage.getItem(USER_INFO_KEY)
  return userInfo ? JSON.parse(userInfo) : null
}

export function setUserInfo(userInfo) {
  localStorage.setItem(USER_INFO_KEY, JSON.stringify(userInfo))
  if (userInfo) {
    if (userInfo.storeId) setStoreId(userInfo.storeId)
    if (userInfo.storeCode) setStoreCode(userInfo.storeCode)
    if (userInfo.storeName) setStoreName(userInfo.storeName)
    if (userInfo.userType) setUserType(userInfo.userType)
  }
}

export function removeUserInfo() {
  localStorage.removeItem(USER_INFO_KEY)
}

export function getStoreId() {
  return localStorage.getItem(STORE_ID_KEY) || ''
}

export function setStoreId(storeId) {
  localStorage.setItem(STORE_ID_KEY, storeId)
}

export function getStoreCode() {
  return localStorage.getItem(STORE_CODE_KEY) || ''
}

export function setStoreCode(storeCode) {
  localStorage.setItem(STORE_CODE_KEY, storeCode)
}

export function getStoreName() {
  return localStorage.getItem(STORE_NAME_KEY) || ''
}

export function setStoreName(storeName) {
  localStorage.setItem(STORE_NAME_KEY, storeName)
}

export function getUserType() {
  return localStorage.getItem(USER_TYPE_KEY) ? parseInt(localStorage.getItem(USER_TYPE_KEY)) : null
}

export function setUserType(userType) {
  localStorage.setItem(USER_TYPE_KEY, userType)
}

export function isHeadquartersUser() {
  const userType = getUserType()
  return userType === 3
}

export function isStoreUser() {
  return !!getStoreId()
}

export function getCurrentUser() {
  const userInfo = getUserInfo()
  return userInfo
}

export function isLoggedIn() {
  return !!getToken() && !!getUserInfo()
}

export function getRemember() {
  const remember = localStorage.getItem(REMEMBER_KEY)
  return remember ? JSON.parse(remember) : { remember: false, username: '', password: '' }
}

export function setRemember(remember, username, password) {
  localStorage.setItem(
    REMEMBER_KEY,
    JSON.stringify({
      remember,
      username: remember ? username : '',
      password: remember ? password : '',
    })
  )
}

export function removeRemember() {
  localStorage.removeItem(REMEMBER_KEY)
}

export function clearAuth() {
  removeToken()
  removeUserInfo()
  localStorage.removeItem(STORE_ID_KEY)
  localStorage.removeItem(STORE_CODE_KEY)
  localStorage.removeItem(STORE_NAME_KEY)
  localStorage.removeItem(USER_TYPE_KEY)
}
