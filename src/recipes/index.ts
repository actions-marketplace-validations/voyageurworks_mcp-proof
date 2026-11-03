import { claudeCode } from "./claudeCode.js";
import { standin } from "./standin.js";
import type { Recipe } from "../types.js";

export const RECIPES: Recipe[] = [claudeCode, standin];
export const recipeById = (id: string) => RECIPES.find(recipe => recipe.id === id);
