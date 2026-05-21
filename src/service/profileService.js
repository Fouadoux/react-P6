import * as mock from './profileServiceMock.js'
import * as api from './profileServiceAPI.jsx'

const service = import.meta.env.VITE_USE_MOCK === 'true' ? mock : api

export const getUserProfile = service.getUserProfile
export const getUserActivity = service.getUserActivity