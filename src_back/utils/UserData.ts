export default interface UserData {
	id:string;
	lastActivity:number;//Timestamp
	created_at:number;//Timestamp
	description?:string;
	/**
	 * @deprecated Don't use this, it's only here for legacy purpose.
	 */
	name?:string;
}