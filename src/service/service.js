import * as mock from '../api/apiMock.js'
import * as api from '../api/api.js'


const service = import.meta.env.VITE_USE_MOCK === 'true' ? mock : api

export const getUserProfile = service.getUserProfile
export const getUserActivity = service.getUserActivity
export const loginApi=service.loginApi