import { typeExample2 } from './file2';
import { oneOrTwo,typeClass } from './file3';
import fs from "fs";

export type typeExample = string;
export const variable:typeClass = {field:""}

export class a{
    myClass:typeClass;
    variable:typeClass= {field:""};
    constructor(){
        const myVar:string ="d"
        const typeClassClone:typeClass = {field:""}
    }
    helloMom(){
        console.log("hello mom")
    }
    createNewTypeClass(){
        return new typeClass();
    }
}