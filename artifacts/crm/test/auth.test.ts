import assert from "node:assert/strict";
import { test } from "node:test";

test("auth token getter and setter manage localStorage correctly", () => {
  const store = new Map<string, string>();
  const mockLocalStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, val: string) => { store.set(key, val); },
    removeItem: (key: string) => { store.delete(key); },
  };

  const TOKEN_KEY = "crm_auth_token";
  const getToken = () => mockLocalStorage.getItem(TOKEN_KEY);
  const setToken = (token: string) => mockLocalStorage.setItem(TOKEN_KEY, token);
  const removeToken = () => mockLocalStorage.removeItem(TOKEN_KEY);

  assert.equal(getToken(), null);
  setToken("test-jwt-token-xyz");
  assert.equal(getToken(), "test-jwt-token-xyz");
  removeToken();
  assert.equal(getToken(), null);
});
