/**
 * The `@Route.X` decorators provide the endpoints
 * - @Route.GET(roles) - retrieve entity
 * - @Route.POST(roles) - create entity
 * - @Route.PATCH(roles) - update / merge entity
 * - @Route.PUT(roles) - replace entity
 * - @Route.DELETE(roles) - remove entity
 * - @Route.all(creators, readers, updaters, deleters) - all routes
 */
import {isActive} from '../index';
import {getCollectionForContainer} from '../models';
import {argumentResolve} from '../utils';
import {ClassAndMethodDecorator, Roles, RolesFunc, RouteAuthArg, RouteMethod, RouteOpt, RouteRoles} from '../types';
import {SymbolKeysNotSupportedError} from '../errors';
import * as Joi from 'joi';
import {Schema} from 'joi';

export type PathFunc = (returns: string) => any;
type SchemaFunc = (enjoi: (type?: any) => typeof Joi | any, joi?: any) => typeof Joi | boolean | Object;

type ArgPathOrRolesOrOpt = string | PathFunc | Roles | RolesFunc | RouteOpt;
type ArgSchemaOrRolesOrOpt = boolean | Schema | SchemaFunc | Roles | RolesFunc | RouteOpt;

function route(
	method: RouteMethod,
	pathOrRolesOrFunctionOrOptions?: ArgPathOrRolesOrOpt,
	schemaOrRolesOrFunction?: ArgSchemaOrRolesOrOpt,
	rolesOrSchemaOrFunction?: ArgSchemaOrRolesOrOpt,
	options?: RouteOpt
): ClassAndMethodDecorator {
	return function(prototype: any, attribute?: string | symbol): any {
		if (!isActive) return;
		if(typeof attribute === 'symbol')
			throw new SymbolKeysNotSupportedError();

		getCollectionForContainer(prototype).decorate('Route', {
			prototype, attribute, method, pathOrRolesOrFunctionOrOptions, schemaOrRolesOrFunction,
			rolesOrSchemaOrFunction, options
		});
		return prototype;
	}
}

export const Route = {
	GET: (
		pathOrRolesOrFunctionOrOptions?: ArgPathOrRolesOrOpt,
		schemaOrRolesOrFunction?: ArgSchemaOrRolesOrOpt,
		rolesOrSchemaOrFunction?: ArgSchemaOrRolesOrOpt,
		options?: RouteOpt
	) => route('get',
		pathOrRolesOrFunctionOrOptions,
		schemaOrRolesOrFunction,
		rolesOrSchemaOrFunction,
		options),
	POST: (
		pathOrRolesOrFunctionOrOptions?: ArgPathOrRolesOrOpt,
		schemaOrRolesOrFunction?: ArgSchemaOrRolesOrOpt,
		rolesOrSchemaOrFunction?: ArgSchemaOrRolesOrOpt,
		options?: RouteOpt
	) => route('post',
		pathOrRolesOrFunctionOrOptions,
		schemaOrRolesOrFunction,
		rolesOrSchemaOrFunction,
		options),
	PATCH: (
		pathOrRolesOrFunctionOrOptions?: ArgPathOrRolesOrOpt,
		schemaOrRolesOrFunction?: ArgSchemaOrRolesOrOpt,
		rolesOrSchemaOrFunction?: ArgSchemaOrRolesOrOpt,
		options?: RouteOpt
	) => route('patch',
		pathOrRolesOrFunctionOrOptions,
		schemaOrRolesOrFunction,
		rolesOrSchemaOrFunction,
		options),
	PUT: (
		pathOrRolesOrFunctionOrOptions?: ArgPathOrRolesOrOpt,
		schemaOrRolesOrFunction?: ArgSchemaOrRolesOrOpt,
		rolesOrSchemaOrFunction?: ArgSchemaOrRolesOrOpt,
		options?: RouteOpt
	) => route('put',
		pathOrRolesOrFunctionOrOptions,
		schemaOrRolesOrFunction,
		rolesOrSchemaOrFunction,
		options),
	DELETE: (
		pathOrRolesOrFunctionOrOptions?: ArgPathOrRolesOrOpt,
		schemaOrRolesOrFunction?: ArgSchemaOrRolesOrOpt,
		rolesOrSchemaOrFunction?: ArgSchemaOrRolesOrOpt,
		options?: RouteOpt
	) => route('delete',
		pathOrRolesOrFunctionOrOptions,
		schemaOrRolesOrFunction,
		rolesOrSchemaOrFunction,
		options),

	auth: (
		authorizeFunction: (arg: RouteAuthArg) => boolean
	) => {
		return function(prototype: any): any {
			const col = getCollectionForContainer(prototype);
			col.decorate('Route.auth', {prototype,authorizeFunction})
		}
	},

	roles: (
		rolesFunction: RouteRoles
	) => {
		return function(prototype: any): any {
			const col = getCollectionForContainer(prototype);
			col.decorate('Route.roles', {prototype,rolesFunction})
		}
	},

	enable: (
		rolesOrCreatorsOrFunction: Roles | RolesFunc = [],
		readersOrFunction?: Roles | RolesFunc,
		updatersOrFunction?: Roles | RolesFunc,
		deletersOrFunction?: Roles | RolesFunc
	) => {
		return function(prototype: any): any {
			const col = getCollectionForContainer(prototype);

			let creators = argumentResolve(rolesOrCreatorsOrFunction);
			let readers = argumentResolve(readersOrFunction);
			let updaters = argumentResolve(updatersOrFunction);
			let deleters = argumentResolve(deletersOrFunction);

			// call (globalRoles)
			if(!readers && !updaters && !deleters){
				readers = creators;
				updaters = creators;
				deleters = creators;
			}

			col.addRoles('creators', creators);
			col.addRoles('readers', readers);
			col.addRoles('updaters', updaters);
			col.addRoles('deleters', deleters);

			// if(col.completed) col.processMetadata();
		}
	},

	all: (
		rolesOrCreatorsOrFunctionOrOptions?: Roles | RolesFunc | RouteOpt,
		readersOrFunctionOrOptions?: Roles | RolesFunc | RouteOpt,
		updatersOrFunctionOrOptions?: Roles | RolesFunc | RouteOpt,
		deletersOrFunctionOrOptions?: Roles | RolesFunc | RouteOpt,
		globalOptions?: RouteOpt
	) => {
		return function(prototype: any): any {
			let creators = argumentResolve(rolesOrCreatorsOrFunctionOrOptions);
			let readers = argumentResolve(readersOrFunctionOrOptions);
			let updaters = argumentResolve(updatersOrFunctionOrOptions);
			let deleters = argumentResolve(deletersOrFunctionOrOptions);

			// call (opt)
			if(creators && !Array.isArray(creators)){
				globalOptions = creators;
				creators = undefined;
			}

			// call (globalRoles, opt?)
			if((!readers || !Array.isArray(readers)) && !updaters && !deleters){
				if(readers) globalOptions = readers;
				readers = creators;
				updaters = creators;
				deleters = creators;
			}

			// setup routes
			route('delete', deleters, globalOptions)(prototype);
			route('put', updaters, globalOptions)(prototype);
			route('patch', updaters, globalOptions)(prototype);
			route('post', creators, globalOptions)(prototype);
			route('get', readers, globalOptions)(prototype);

			// const col = getCollectionForContainer(prototype);
			// if(col.completed) col.processMetadata();

			return prototype;
		};
	}
};