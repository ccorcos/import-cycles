import { typeExample2 } from './file2';
import { oneOrTwo,typeClass } from './file3';
import fs from "fs";

export type typeExample = string;
const variable:typeClass = {field:""}
class x extends typeClass{
    constructor(){
        super()
    }
}
export function a(){
    const myClass = new typeClass();
    const variable:typeClass = {field:""}
}