export default interface UserData {
	id:string;
	name?:string;//Don't use this ! here for sort of legacy purpose
	created_at:number;//Timestamp
	description?:string;
}