using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace UltimaExodus.Data.Migrations
{
    /// <inheritdoc />
    public partial class InitialGameState : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "GameStates",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false),
                    TileX = table.Column<int>(type: "INTEGER", nullable: false),
                    TileY = table.Column<int>(type: "INTEGER", nullable: false),
                    MapId = table.Column<string>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_GameStates", x => x.Id);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "GameStates");
        }
    }
}
