const TOKEN_KEY = 'cashier_token'
const USER_INFO_KEY = 'cashier_user_info'
const REMEMBER_KEY = 'cashier_remember'

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
}

export function removeUserInfo() {
  localStorage.removeItem(USER_INFO_KEY)
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
}
