package core

import (
	"context"
	"testing"

	"github.com/dagger/testctx"
	"github.com/moby/buildkit/identity"
	"github.com/stretchr/testify/require"

	"dagger.io/dagger"
)

type HTTPSuite struct{}

func TestHTTP(t *testing.T) {
	testctx.New(t, Middleware()...).RunTests(HTTPSuite{})
}

func (HTTPSuite) TestHTTP(ctx context.Context, t *testctx.T) {
	c := connect(ctx, t)

	// do two in a row to ensure each gets downloaded correctly
	url := "https://raw.githubusercontent.com/dagger/dagger/main/CONTRIBUTING.md"
	contents, err := c.HTTP(url).Contents(ctx)
	require.NoError(t, err)
	require.Contains(t, contents, "tests")

	url = "https://raw.githubusercontent.com/dagger/dagger/main/README.md"
	contents, err = c.HTTP(url).Contents(ctx)
	require.NoError(t, err)
	require.Contains(t, contents, "Dagger")
}

func (HTTPSuite) TestHTTPService(ctx context.Context, t *testctx.T) {
	c := connect(ctx, t)

	svc, url := httpService(ctx, t, c, "Hello, world!")

	contents, err := c.HTTP(url, dagger.HTTPOpts{
		ExperimentalServiceHost: svc,
	}).Contents(ctx)
	require.NoError(t, err)
	require.Equal(t, contents, "Hello, world!")
}

func (HTTPSuite) TestHTTPServiceStableDigest(ctx context.Context, t *testctx.T) {
	content := identity.NewID()
	hostname := func(c *dagger.Client) string {
		svc, url := httpService(ctx, t, c, content)

		hn, err := c.Container().
			From(alpineImage).
			WithMountedFile("/index.html", c.HTTP(url, dagger.HTTPOpts{
				ExperimentalServiceHost: svc,
			})).
			WithDefaultArgs([]string{"sleep"}).
			AsService().
			Hostname(ctx)
		require.NoError(t, err)
		return hn
	}

	c1 := connect(ctx, t)
	c2 := connect(ctx, t)
	require.Equal(t, hostname(c1), hostname(c2))
}
