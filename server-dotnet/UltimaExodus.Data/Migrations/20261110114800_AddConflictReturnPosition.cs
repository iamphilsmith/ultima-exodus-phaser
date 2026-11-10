using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace UltimaExodus.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddConflictReturnPosition : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ReturnMapId",
                table: "GameStates",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "ReturnTileX",
                table: "GameStates",
                type: "INTEGER",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "ReturnTileY",
                table: "GameStates",
                type: "INTEGER",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ReturnMapId",
                table: "GameStates");

            migrationBuilder.DropColumn(
                name: "ReturnTileX",
                table: "GameStates");

            migrationBuilder.DropColumn(
                name: "ReturnTileY",
                table: "GameStates");
        }
    }
}
