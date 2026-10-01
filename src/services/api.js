import axios from "axios";
import { API_URL } from "../config/api";

const API = axios.create({
    baseURL: API_URL
});

API.interceptors.request.use((config) => {

    const token = localStorage.getItem("token");

    if (token) {

        config.headers.Authorization =
            `Bearer ${token}`;
    }

    return config;
});

export default API;


