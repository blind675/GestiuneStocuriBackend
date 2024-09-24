/**
 * entrie controller
 */

import { factories } from "@strapi/strapi";
import { errors } from "@strapi/utils";

export default factories.createCoreController(
  "api::entrie.entrie",
  ({ strapi }) => {
    return {
      async create(ctx) {
        const { data } = ctx.request.body;

        if (!data?.article) {
          throw new errors.ValidationError("Article Id is required");
        }

        if (!data?.price) {
          throw new errors.ValidationError("Price is required");
        }

        if (!data?.quantity) {
          throw new errors.ValidationError("Quantity is required");
        }

        const article = await await strapi.db
          .query("api::articol.articol")
          .findOne({ where: { id: data.article } });

        if (!article) {
          throw new errors.ValidationError("Article not found");
        }

        const entry = await strapi.db
          .query("api::entrie.entrie")
          .create({ data });

        // get the stock of the article and update it
        const stock = await strapi.db.query("api::stock.stock").findOne({
          where: { articol: data.article },
          populate: ["entries"],
        });

        // if no stock found create one with the current article and entry and set the price and quantity to the entry values
        if (!stock) {
          await strapi.db.query("api::stock.stock").create({
            data: {
              articol: data.article,
              price_per_unit: data.price,
              total_quantity: data.quantity,
              entries: [entry.id],
            },
          });
        } else {
          // if stock found update the price and quantity
          const newTotalQuantity =
            parseInt(stock.total_quantity) + parseInt(data.quantity);
          // calculate the weighted medium price
          const newPrice =
            (parseInt(stock.price_per_unit) * parseInt(stock.total_quantity) +
              parseInt(data.price) * parseInt(data.quantity)) /
            newTotalQuantity;

          await strapi.db.query("api::stock.stock").update({
            where: { id: stock.id },
            data: {
              price_per_unit: newPrice,
              total_quantity: newTotalQuantity,
              entries: [...stock.entries, entry.id],
            },
          });
        }

        return { data: entry };
      },
    };
  }
);
